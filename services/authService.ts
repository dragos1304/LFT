import { User } from "../types";

const MOCK_USERS: User[] = [
  { uid: "1", displayName: "Alex", email: "alex@example.com" },
  { uid: "2", displayName: "Beth", email: "beth@example.com" },
  { uid: "3", displayName: "Charlie", email: "charlie@example.com" },
  { uid: "4", displayName: "Dana", email: "dana@example.com" },
  { uid: "5", displayName: "Eli", email: "eli@example.com" },
];

export const getMockUsers = (): User[] => {
  return MOCK_USERS;
};

export const getUserById = (uid: string): User | undefined => {
  return MOCK_USERS.find(u => u.uid === uid);
};