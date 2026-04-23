import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Permission } from '../../permissions/schemas/permission.schema';
import { Role } from './role.schema';

export type RolePermissionDocument = RolePermission & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      ret.roleId = ret.roleId.toString();
      if (ret.permissionId) {
        if (typeof ret.permissionId === 'object') {
          ret.permissionId = {
            ...ret.permissionId,
            id: ret.permissionId._id.toString(),
            _id: ret.permissionId._id.toString()
          };
        } else {
          ret.permissionId = ret.permissionId.toString();
        }
      }
      return ret;
    }
  }
})
export class RolePermission {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Role' })
  roleId: Types.ObjectId | Role;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Permission' })
  permissionId: Types.ObjectId | Permission;
}

export const RolePermissionSchema = SchemaFactory.createForClass(RolePermission);