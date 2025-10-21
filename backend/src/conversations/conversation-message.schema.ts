// src/conversations/conversation-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationMessageDocument = HydratedDocument<ConversationMessage>;

@Schema({ timestamps: true, collection: 'conversation_messages' })
export class ConversationMessage {
  @Prop({ type: Types.ObjectId, ref: 'ConversationThread', required: true })
  threadId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, enum: ['teacher', 'parent'], required: true })
  senderRole: 'teacher' | 'parent';

  @Prop({ type: String, required: true })
  content: string;
}
export const ConversationMessageSchema =
  SchemaFactory.createForClass(ConversationMessage);
ConversationMessageSchema.index({ threadId: 1, createdAt: -1 });
