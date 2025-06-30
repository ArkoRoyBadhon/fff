
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  
  const users = await User.find({
    subscriptionStatus: 'active',
    currentPackage: { $exists: true, $ne: null },
    $or: [
      { 'packageConditions.current': null },
      { 'packageConditions.current': { $exists: false } }
    ]
  });

  for (const user of users) {
    const package = await Package.findById(user.currentPackage);
    if (package) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'packageConditions.current': {
              name: package.name,
              conditions: package.conditions,
              isArchived: false
            }
          }
        }
      );
      console.log(`Updated user ${user.email}`);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(console.error);