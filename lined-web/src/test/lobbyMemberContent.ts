/**
 * Shared accessible names / roles / test ids / copy for the lobby Members
 * tab and Add Member modal, so their tests don't each hardcode the same
 * strings and drift out of sync when the copy changes.
 */

export const ROLES = {
  button: 'button',
  heading: 'heading',
} as const;

export const TEST_IDS = {
  confirmDialogBackdrop: 'confirm-dialog-backdrop',
  lobbyMembersLoading: 'lobby-members-loading',
  pendingInvitesLoading: 'pending-invites-loading',
  addMemberSearchLoading: 'add-member-search-loading',
} as const;

export const NUMBERS = {
  aliceAndAnastasiiaMemberCount: 2,
} as const;

export const CONFIRM_DIALOG_TEXT = {
  pleaseWaitLabel: 'Please wait…',
  cancelButtonName: 'Cancel',
} as const;

export const MEMBER_CARD_TEXT = {
  ownerBadge: 'Owner',
  memberBadge: 'Member',
  thatsYou: "That's you",
  makeOwnerButtonName: 'Make owner',
  removeButtonName: 'Remove',
} as const;

export const PENDING_INVITE_TEXT = {
  resendButtonName: 'Resend',
  resendingLabel: 'Resending…',
  cancelButtonName: 'Cancel',
} as const;

export const LOBBY_MEMBER_LIST_TEXT = {
  membersHeading: (count: number) => `Members · ${count}`,
  pendingInvitesHeading: 'Pending Invites',
  noPendingInvites: 'No pending invites.',
  loadMembersError: "Couldn't load members. Try again later.",
  loadInvitesError: "Couldn't load pending invites.",
  resendError: "Couldn't resend — try again",
  makeOwnerError: 'Could not transfer ownership — please try again',
  removeError: 'Could not remove this member — please try again',
} as const;

export const ADD_MEMBER_MODAL_TEXT = {
  title: 'Add Member',
  searchLabel: 'Search user',
  minCharsHint: 'Type at least 2 characters to search.',
  noUsersFound: 'No users found.',
  searchFailed: 'Search failed — try again.',
  inviteButtonName: 'Invite',
  inviteSentButtonName: 'Invite sent',
  alreadyMemberSuffix: 'already in lobby',
  conflictError: 'Already a member or already invited',
  genericInviteError: "Couldn't send invite — try again",
  doneButtonName: 'Done',
  closeButtonName: 'Close',
  inviteLinkHint: /You can also share an invite link/,
} as const;
