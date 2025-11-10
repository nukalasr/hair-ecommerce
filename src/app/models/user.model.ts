export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller' | 'admin';
  phone?: string;
  address?: Address;
  createdAt: Date;
}

/**
 * Internal user data with password credentials
 * Used only for authentication, never exposed to UI
 */
export interface UserCredentials extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
