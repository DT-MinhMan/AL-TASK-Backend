import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/modules/users/schemas/users.schema';

async function seedAdmin() {
  const dbUri = process.env.DB_CONNECTION_STRING;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || 'System Admin';

  if (!dbUri) {
    throw new Error('Missing DB_CONNECTION_STRING');
  }

  if (!email || !password) {
    throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD');
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }

  await mongoose.connect(dbUri);

  const UserModel = mongoose.model(User.name, UserSchema);
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());

  const result = await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        password: hashedPassword,
        fullName,
        role: 'admin',
        status: 'active',
      },
    },
    { new: true, upsert: true },
  );

  console.log(`Admin account is ready: ${result.email}`);
}

seedAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
