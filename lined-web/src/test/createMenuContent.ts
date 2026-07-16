/**
 * Shared accessible names / roles for the "+ Create" menu, Create Lobby
 * modal, and lobby-type picker, so their tests don't each hardcode the
 * same copy and drift out of sync when it changes.
 */

export const ROLES = {
  button: 'button',
  radio: 'radio',
  radiogroup: 'radiogroup',
  alert: 'alert',
} as const;

export const CREATE_MENU_TEXT = {
  triggerName: /create/i,
  newEvent: 'New Event',
  newTask: 'New Task',
  newLobby: 'New Lobby',
  reserveFreeSlot: 'Reserve Free Slot',
} as const;

export const CREATE_LOBBY_MODAL_TEXT = {
  nameFieldLabel: /lobby name/i,
  typeFieldLabel: /lobby type/i,
  ownerHint: /you'll be the owner/i,
  submitButtonName: /create lobby/i,
  cancelButtonName: /cancel/i,
  closeButtonName: /close/i,
} as const;

export const LOBBY_TYPE_OPTION_NAME = {
  COUPLE: /couple/i,
  FAMILY: /family/i,
  FRIENDS: /friends/i,
  WORK: /work/i,
} as const;
