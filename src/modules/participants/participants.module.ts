import { Global, Module } from '@nestjs/common';
import { ParticipantsRepository } from './repositories/participants.repository.js';

@Global()
@Module({ providers: [ParticipantsRepository], exports: [ParticipantsRepository] })
export class ParticipantsModule {}
