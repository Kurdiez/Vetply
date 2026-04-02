import { UserType } from '@vetply/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    enumName: 'user_type_enum',
    default: UserType.Member,
  })
  userType!: UserType;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'google_sub', type: 'varchar', nullable: true, unique: true })
  googleSub!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
