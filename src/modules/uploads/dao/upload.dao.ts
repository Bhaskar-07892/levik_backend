import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { UPLOAD_PURPOSES, type UploadPurpose } from '../../../common/domain/enums.js';

@Entity('uploads')
export class UploadDao {
  @PrimaryColumn('text')
  key: string;

  @Column('text', { name: 'owner_id' })
  ownerId: string;

  @Column('text', { name: 'owner_role' })
  ownerRole: string;

  @Column({ type: 'enum', enum: UPLOAD_PURPOSES, enumName: 'upload_purpose' })
  purpose: UploadPurpose;

  @Column('text', { name: 'content_type' })
  contentType: string;

  @Column('int', { name: 'size_bytes' })
  sizeBytes: number;

  @Column('text', { name: 'original_name', nullable: true })
  originalName: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
