import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '../schemas/role.schema';
import { RolePermission, RolePermissionDocument } from '../schemas/role-permission.schema';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRolePermissionsDto } from '../dtos/update-role-permissions.dto';
import { Permission } from '../../permissions/schemas/permission.schema';
import { User } from '../../users/schemas/users.schema';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(RolePermission.name) private rolePermissionModel: Model<RolePermissionDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Create the role
    const roleData = {
      name: createRoleDto.name,
      description: createRoleDto.description || '',
    };
    const createdRole = new this.roleModel(roleData);
    const savedRole = await createdRole.save();

    // If permission IDs are provided, assign them to the role
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      await this.updateRolePermissions({
        roleId: savedRole.id,
        permissionIds: createRoleDto.permissionIds,
      });
    }

    return savedRole;
  }

  async update(id: string, updateRoleDto: Partial<CreateRoleDto>): Promise<Role> {
    const roleData: Partial<Role> = {};

    if (updateRoleDto.name !== undefined) {
      roleData.name = updateRoleDto.name;
    }

    if (updateRoleDto.description !== undefined) {
      roleData.description = updateRoleDto.description;
    }

    const updatedRole = await this.roleModel.findByIdAndUpdate(id, roleData, { new: true });

    // If permission IDs are provided, update the role's permissions
    if (updateRoleDto.permissionIds) {
      await this.updateRolePermissions({
        roleId: id,
        permissionIds: updateRoleDto.permissionIds,
      });
    }

    if (!updatedRole) {
      throw new NotFoundException('Role not found');
    }

    return updatedRole;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    // Find all users with this role and remove their roleId
    await this.userModel.updateMany(
      { roleId: new Types.ObjectId(id) },
      { $unset: { roleId: "" } }
    );

    // Delete the role
    const result = await this.roleModel.deleteOne({ _id: id });

    // Also delete all role permission entries for this role
    await this.rolePermissionModel.deleteMany({ roleId: id });

    return { deleted: result.deletedCount > 0 };
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    try {
      const objectId = new Types.ObjectId(roleId);
      const permissions = await this.rolePermissionModel
        .find({ roleId: objectId })
        .populate('permissionId')
        .exec();
      return permissions;
    } catch (error) {
      console.error('Error getting role permissions:', error);
      throw error;
    }
  }

  async updateRolePermissions(updateDto: { roleId: string; permissionIds: string[] }): Promise<RolePermission[]> {
    try {
      const roleId = new Types.ObjectId(updateDto.roleId);
      const permissionIds = updateDto.permissionIds.map(id => new Types.ObjectId(id));

      // Delete all existing permissions for the role
      await this.rolePermissionModel.deleteMany({ roleId });

      if (permissionIds.length > 0) {
        // Create new permissions
        const rolePermissions = permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        }));

        // Insert new permissions
        await this.rolePermissionModel.insertMany(rolePermissions);

        // Find all users with this role and update their permissions
        const usersWithRole = await this.userModel.find({ roleId }).exec();
        console.log(`Found ${usersWithRole.length} users with role ${roleId}`);

        // Update each user's permissions based on the role's permissions
        for (const user of usersWithRole) {
          console.log(`Updating permissions for user ${user._id}`);
          // The actual permission update will be handled by the PermissionGuard
          // which will now check both direct user permissions and role permissions
        }
      }

      // Return updated permissions with populated data
      const updatedPermissions = await this.rolePermissionModel
        .find({ roleId })
        .populate('permissionId')
        .exec();

      return updatedPermissions;
    } catch (error) {
      console.error('Error updating role permissions:', error);
      throw error;
    }
  }

  async getAllRolesWithPermissions(): Promise<any[]> {
    const roles = await this.roleModel.find().exec();
    const result: any[] = [];

    for (const role of roles) {
      const permissions = await this.getRolePermissions(role.id);

      const permissionDetails = permissions.map(p => {
        // p.permissionId may be a populated Permission document or just an ObjectId
        // If populated, it will have _id, resource, action, etc.
        // If not, skip or handle accordingly
        const permissionDoc = p.permissionId as Permission & { _id?: any };
        // Use _id as id, fallback to string if needed
        let id: string | undefined;
        if (permissionDoc && typeof permissionDoc === 'object' && permissionDoc._id) {
          id = permissionDoc._id.toString();
        } else if (typeof p.permissionId === 'string') {
          id = p.permissionId;
        } else {
          id = undefined;
        }
        return {
          id,
          resource: (permissionDoc && (permissionDoc as any).resource) || undefined,
          action: (permissionDoc && (permissionDoc as any).action) || undefined,
        };
      });

      result.push({
        id: role.id ?? (role._id ? role._id.toString() : undefined),
        name: role.name,
        description: role.description,
        permissions: permissionDetails,
      });
    }

    return result;
  }
}