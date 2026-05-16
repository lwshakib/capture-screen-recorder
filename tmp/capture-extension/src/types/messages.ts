/**
 * Type definitions for Chrome extension messages
 */

export type MessageAction =
  | "TOGGLE"
  | "TOGGLE_WEBCAM"
  | "AUTH_START"
  | "AUTH_SUCCESS"
  | "AUTH_ERROR"
  | "AUTH_STATE";

export interface BaseMessage {
  action: MessageAction;
}

export interface ToggleMessage extends BaseMessage {
  action: "TOGGLE";
}

export interface ToggleWebcamMessage extends BaseMessage {
  action: "TOGGLE_WEBCAM";
}

export interface AuthStartMessage extends BaseMessage {
  action: "AUTH_START";
  webUrl: string;
}

export interface AuthSuccessMessage extends BaseMessage {
  action: "AUTH_SUCCESS";
  payload: {
    token: string;
  };
}

export interface AuthErrorMessage extends BaseMessage {
  action: "AUTH_ERROR";
  payload: {
    reason: string;
  };
}

export interface AuthStateMessage extends BaseMessage {
  action: "AUTH_STATE";
  payload: {
    isSignedIn?: boolean;
    user?: any;
  };
}

export type ExtensionMessage =
  | ToggleMessage
  | ToggleWebcamMessage
  | AuthStartMessage
  | AuthSuccessMessage
  | AuthErrorMessage
  | AuthStateMessage;

