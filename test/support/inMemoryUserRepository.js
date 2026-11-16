import { hashPassword } from '../../src/passwords.js';

/** Repositorio de usuarios en memoria para las pruebas. */
export class InMemoryUserRepository {
  constructor(users = []) {
    this.users = users.map((user) => ({ ...user }));
  }

  async findByUsername(username) {
    const normalized = String(username).toLowerCase();
    return (
      this.users.find((user) => user.username.toLowerCase() === normalized) || null
    );
  }

  async findById(id) {
    return this.users.find((user) => String(user.id) === String(id)) || null;
  }
}

export const sampleUsers = [
  {
    id: 1,
    username: 'ana',
    displayName: 'Ana López',
    passwordHash: hashPassword('pedidos123', 'test-ana'),
  },
  {
    id: 2,
    username: 'carlos',
    displayName: 'Carlos Ramírez',
    passwordHash: hashPassword('pedidos123', 'test-carlos'),
  },
  {
    id: 3,
    username: 'maria',
    displayName: 'María Torres',
    passwordHash: hashPassword('pedidos123', 'test-maria'),
  },
  {
    id: 4,
    username: 'luis',
    displayName: 'Luis Hernández',
    passwordHash: hashPassword('pedidos123', 'test-luis'),
  },
];
