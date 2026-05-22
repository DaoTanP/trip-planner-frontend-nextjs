import { TripEditorShell } from "../components/editor/trip-editor-shell";

interface TripEditorPageProps {
  tripId: string;
}

export function TripEditorPage({ tripId }: TripEditorPageProps) {
  return <TripEditorShell tripId={tripId} />;
}
