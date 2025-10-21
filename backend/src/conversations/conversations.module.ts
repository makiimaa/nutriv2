// src/conversations/conversations.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationThread,
  ConversationThreadSchema,
} from './conversation-thread.schema';
import {
  ConversationMessage,
  ConversationMessageSchema,
} from './conversation-message.schema';
import { ConversationsController } from './conversations.controller';
import { Student, StudentSchema } from '../students/student.schema';
import { ClassEntity, ClassSchema } from '../classes/class.schema';
import { Parent, ParentSchema } from '../parents/parent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationThread.name, schema: ConversationThreadSchema },
      { name: ConversationMessage.name, schema: ConversationMessageSchema },
      { name: Student.name, schema: StudentSchema },
      { name: ClassEntity.name, schema: ClassSchema },
      { name: Parent.name, schema: ParentSchema },
    ]),
  ],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
