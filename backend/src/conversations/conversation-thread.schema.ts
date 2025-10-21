// src/conversations/conversation-thread.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationThreadDocument = HydratedDocument<ConversationThread>;

@Schema({ timestamps: true, collection: 'conversation_threads' })
export class ConversationThread {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, unique: true })
  studentId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Teacher', default: [] })
  teacherIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Parent', required: false })
  parentId?: Types.ObjectId;

  @Prop({ type: Date }) lastMessageAt?: Date;
}
export const ConversationThreadSchema =
  SchemaFactory.createForClass(ConversationThread);
