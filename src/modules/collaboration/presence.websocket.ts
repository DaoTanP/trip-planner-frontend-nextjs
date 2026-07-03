"use client";

import { collaborationConfig } from "@/config/collaboration";

import { reportRevisionConflict } from "./conflict.store";
import {
  pruneStalePresence,
  replaceTripPresenceSnapshot,
  removePresenceClient,
  setPresenceConnectionStatus,
  upsertTripPresence
} from "./presence.store";
import { getPresenceChannelName, normalizePresenceSocketEvent } from "./presence.service";
import type { PresenceSocketEvent, TripPresence } from "./types/presence.types";

type PresenceTransportOptions = {
  tripId: string;
  clientId: string;
  deviceId: string;
  onConnected?: (() => void) | undefined;
  onTripUpdated?:
    | ((event: Extract<PresenceSocketEvent, { type: "trip.updated" }>) => void)
    | undefined;
  onPlanningInvalidated?:
    | ((event: Extract<PresenceSocketEvent, { type: "planning.invalidated" }>) => void)
    | undefined;
};

type PresenceFactory = () => TripPresence | null;

export class CollaborationPresenceTransport {
  private readonly tripId: string;
  private readonly clientId: string;
  private readonly deviceId: string;
  private readonly onTripUpdated:
    | ((event: Extract<PresenceSocketEvent, { type: "trip.updated" }>) => void)
    | undefined;
  private readonly onPlanningInvalidated:
    | ((event: Extract<PresenceSocketEvent, { type: "planning.invalidated" }>) => void)
    | undefined;
  private readonly onConnected: (() => void) | undefined;
  private channel: BroadcastChannel | null = null;
  private socket: WebSocket | null = null;
  private heartbeatId: number | null = null;
  private reconnectId: number | null = null;
  private stopped = false;
  private reconnectAttempt = 0;
  private getPresence: PresenceFactory = () => null;
  private readonly lastEventSequenceByTripId = new Map<string, number>();
  private readonly snapshotRecoveryRequestedAtByTripId = new Map<string, number>();

  constructor({
    tripId,
    clientId,
    deviceId,
    onConnected,
    onPlanningInvalidated,
    onTripUpdated
  }: PresenceTransportOptions) {
    this.tripId = tripId;
    this.clientId = clientId;
    this.deviceId = deviceId;
    this.onConnected = onConnected;
    this.onTripUpdated = onTripUpdated;
    this.onPlanningInvalidated = onPlanningInvalidated;
  }

  start(getPresence: PresenceFactory) {
    this.stopped = false;
    this.getPresence = getPresence;
    this.startLocalChannel();

    if (collaborationConfig.websocketUrl) {
      this.connectSocket();
    } else {
      setPresenceConnectionStatus(this.tripId, "connected", "local");
    }

    this.publishPresence("presence.join");
    this.heartbeatId = window.setInterval(() => {
      pruneStalePresence();
      this.publishPresence("presence.heartbeat");
    }, collaborationConfig.heartbeatMs);
  }

  stop() {
    this.stopped = true;

    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
    }
    if (this.reconnectId !== null) {
      window.clearTimeout(this.reconnectId);
    }

    this.publish({
      type: "presence.leave",
      tripId: this.tripId,
      clientId: this.clientId,
      deviceId: this.deviceId
    });
    this.channel?.removeEventListener("message", this.handleBroadcastMessage);
    this.channel?.close();
    this.channel = null;
    this.socket?.close();
    this.socket = null;
    removePresenceClient(this.clientId);
    setPresenceConnectionStatus(this.tripId, "idle", "local");
  }

  publishPresence(type: PresenceSocketEvent["type"] = "presence.focus.changed") {
    const presence = this.getPresence();

    if (!presence) {
      return;
    }

    upsertTripPresence(presence);

    const event =
      type === "presence.edit.started" ||
      type === "presence.edit.stopped" ||
      type === "presence.focus.changed" ||
      type === "presence.cursor.changed" ||
      type === "presence.join" ||
      type === "presence.heartbeat"
        ? ({ type, presence } as PresenceSocketEvent)
        : ({ type: "presence.heartbeat", presence } satisfies PresenceSocketEvent);

    this.publish(event);
  }

  private startLocalChannel() {
    this.channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(getPresenceChannelName(this.tripId))
        : null;
    this.channel?.addEventListener("message", this.handleBroadcastMessage);
  }

  private connectSocket() {
    const socketUrl = this.getSocketUrl();

    if (!socketUrl) {
      setPresenceConnectionStatus(this.tripId, "connected", "local");
      return;
    }

    setPresenceConnectionStatus(
      this.tripId,
      this.socket ? "reconnecting" : "connecting",
      "websocket"
    );
    this.socket = new WebSocket(socketUrl);

    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      setPresenceConnectionStatus(this.tripId, "connected", "websocket");
      this.publishPresence("presence.join");
      this.onConnected?.();
    });
    this.socket.addEventListener("message", (event) => this.handleSocketMessage(event.data));
    this.socket.addEventListener("close", () => this.handleSocketClose());
    this.socket.addEventListener("error", () => {
      this.socket?.close();
    });
  }

  private handleSocketClose() {
    this.socket = null;

    if (this.stopped) {
      return;
    }

    setPresenceConnectionStatus(this.tripId, "reconnecting", "websocket");
    this.reconnectAttempt += 1;
    this.reconnectId = window.setTimeout(() => this.connectSocket(), this.getReconnectDelayMs());
  }

  private getSocketUrl() {
    if (!collaborationConfig.websocketUrl) {
      return null;
    }

    try {
      const url = new URL(collaborationConfig.websocketUrl);
      url.searchParams.set("tripId", this.tripId);
      url.searchParams.set("clientId", this.clientId);
      url.searchParams.set("deviceId", this.deviceId);

      return url.toString();
    } catch {
      return null;
    }
  }

  private publish(event: PresenceSocketEvent) {
    this.channel?.postMessage(event);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private readonly handleBroadcastMessage = (event: MessageEvent<unknown>) => {
    this.handleIncomingEvent(event.data);
  };

  private handleSocketMessage(data: unknown) {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      this.trackEventSequence(parsed);
      this.handleIncomingEvent(parsed);
    } catch {
      return;
    }
  }

  private handleIncomingEvent(value: unknown) {
    const event = normalizePresenceSocketEvent(value);

    if (!event) {
      return;
    }

    if (event.type === "trip.updated") {
      if (event.tripId === this.tripId) {
        this.onTripUpdated?.(event);
      }

      return;
    }

    if (event.type === "planning.invalidated") {
      if (event.tripId === this.tripId) {
        this.onPlanningInvalidated?.(event);
      }

      return;
    }

    if (event.type === "revision.conflict") {
      if (event.tripId === this.tripId) {
        reportRevisionConflict({
          tripId: event.tripId,
          entityType: event.entityType,
          entityId: event.entityId,
          operation: event.operation,
          localPayload: event.localPayload,
          details: event.details
        });
      }

      return;
    }

    if (event.type === "presence.snapshot") {
      if (event.tripId === this.tripId) {
        replaceTripPresenceSnapshot(event.tripId, event.presences, this.clientId);
      }

      return;
    }

    if (event.type === "presence.leave") {
      if (event.tripId === this.tripId && event.clientId !== this.clientId) {
        removePresenceClient(event.clientId);
      }

      return;
    }

    if (event.presence.tripId === this.tripId && event.presence.clientId !== this.clientId) {
      upsertTripPresence(event.presence);
    }
  }

  private trackEventSequence(value: unknown) {
    if (!value || typeof value !== "object") {
      return;
    }

    const envelope = value as {
      tripId?: unknown;
      eventSequence?: unknown;
    };

    if (typeof envelope.tripId !== "string" || typeof envelope.eventSequence !== "number") {
      return;
    }

    const previous = this.lastEventSequenceByTripId.get(envelope.tripId);

    if (previous !== undefined && envelope.eventSequence > previous + 1) {
      this.requestSnapshotRecovery(envelope.tripId);
    }

    this.lastEventSequenceByTripId.set(
      envelope.tripId,
      Math.max(previous ?? 0, envelope.eventSequence)
    );
    this.acknowledgeEvent(envelope.tripId, envelope.eventSequence);
  }

  private acknowledgeEvent(tripId: string, eventSequence: number) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type: "connection.ack",
        tripId,
        eventSequence
      })
    );
  }

  private requestSnapshotRecovery(tripId: string) {
    const now = Date.now();
    const lastRequestedAt = this.snapshotRecoveryRequestedAtByTripId.get(tripId) ?? 0;

    if (now - lastRequestedAt < 2_000 || this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.snapshotRecoveryRequestedAtByTripId.set(tripId, now);
    this.socket.send(
      JSON.stringify({
        type: "trip.subscribe",
        tripId
      })
    );
  }

  private getReconnectDelayMs() {
    const baseDelayMs =
      collaborationConfig.reconnectMs * 2 ** Math.max(0, this.reconnectAttempt - 1);
    const cappedDelayMs = Math.min(30_000, baseDelayMs);
    const jitterMs = Math.floor(Math.random() * Math.min(1_000, cappedDelayMs));

    return cappedDelayMs + jitterMs;
  }
}
