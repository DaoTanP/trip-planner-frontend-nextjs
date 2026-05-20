import type {
  AuthLoginResponseDto,
  AuthSessionResponseDto,
  AuthTokensDto,
  LoginRequestDto,
  OAuthLoginRequestDto,
  PublicUserDto,
  RegisterRequestDto
} from "@/services/api/contracts";

export type AuthUser = PublicUserDto;
export type AuthTokens = AuthTokensDto;
export type LoginPayload = LoginRequestDto;
export type RegisterPayload = RegisterRequestDto;
export type OAuthProvider = "google";
export type OAuthLoginPayload = OAuthLoginRequestDto;
export type AuthLoginResponse = AuthLoginResponseDto;
export type AuthSession = AuthSessionResponseDto;
