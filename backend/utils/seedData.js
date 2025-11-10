const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');

// Load environment variables
dotenv.config();

// Sample users
const users = [
  {
    firstName: 'Buyer',
    lastName: 'Demo',
    email: 'buyer@example.com',
    password: 'DemoPassword123!',
    role: 'buyer',
    isActive: true,
    isEmailVerified: true
  },
  {
    firstName: 'Seller',
    lastName: 'Demo',
    email: 'seller@example.com',
    password: 'DemoPassword123!',
    role: 'seller',
    isActive: true,
    isEmailVerified: true
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'admin',
    isActive: true,
    isEmailVerified: true
  }
];

// Sample products
const sampleProducts = [
  {
    name: 'Brazilian Virgin Straight Hair 20"',
    description: 'Premium quality Brazilian virgin hair bundle. 100% unprocessed human hair. Can be dyed and styled.',
    price: 149.99,
    category: 'virgin-hair',
    texture: 'straight',
    length: 20,
    origin: 'brazilian',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    rating: 4.8,
    numReviews: 24,
    isFeatured: true
  },
  {
    name: 'Peruvian Body Wave 18"',
    description: 'Beautiful Peruvian body wave hair. Soft, bouncy waves that blend well.',
    price: 129.99,
    category: 'virgin-hair',
    texture: 'body-wave',
    length: 18,
    origin: 'peruvian',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1595475884562-073c30d45670?w=400',
    rating: 4.7,
    numReviews: 18,
    isFeatured: true
  },
  {
    name: 'Malaysian Curly Hair 16"',
    description: 'Natural Malaysian curly hair. Perfect for voluminous, bouncy curls.',
    price: 139.99,
    category: 'virgin-hair',
    texture: 'curly',
    length: 16,
    origin: 'malaysian',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400',
    rating: 4.9,
    numReviews: 31
  },
  {
    name: 'Indian Straight Hair 22"',
    description: 'Long, silky Indian straight hair. Excellent quality and shine.',
    price: 159.99,
    category: 'virgin-hair',
    texture: 'straight',
    length: 22,
    origin: 'indian',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400',
    rating: 4.6,
    numReviews: 15
  },
  {
    name: 'Brazilian Deep Wave 14"',
    description: 'Luxurious Brazilian deep wave hair. Creates beautiful, defined waves.',
    price: 119.99,
    category: 'virgin-hair',
    texture: 'deep-wave',
    length: 14,
    origin: 'brazilian',
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400',
    rating: 4.5,
    numReviews: 22,
    isFeatured: true
  },
  {
    name: 'Vietnamese Straight Hair 24"',
    description: 'Extra long Vietnamese straight hair. Thick and healthy.',
    price: 179.99,
    category: 'virgin-hair',
    texture: 'straight',
    length: 24,
    origin: 'vietnamese',
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400',
    rating: 4.8,
    numReviews: 19
  },
  {
    name: 'Lace Closure 4x4 Brazilian Straight',
    description: 'Brazilian straight lace closure. Natural hairline, pre-plucked.',
    price: 79.99,
    category: 'closure',
    texture: 'straight',
    length: 16,
    origin: 'brazilian',
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400',
    rating: 4.7,
    numReviews: 28
  },
  {
    name: 'Lace Frontal 13x4 Body Wave',
    description: 'Peruvian body wave lace frontal. Ear to ear coverage.',
    price: 99.99,
    category: 'frontal',
    texture: 'body-wave',
    length: 18,
    origin: 'peruvian',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
    rating: 4.6,
    numReviews: 16
  }
];

// Connect to database and seed
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Get seller ID
    const seller = createdUsers.find(u => u.role === 'seller');

    // Add seller to products
    const productsWithSeller = sampleProducts.map(product => ({
      ...product,
      seller: seller._id
    }));

    // Create products
    const createdProducts = await Product.create(productsWithSeller);
    console.log(`✅ Created ${createdProducts.length} products`);

    console.log('\n📊 Database seeded successfully!');
    console.log('\n🔐 Demo Accounts:');
    console.log('Buyer:  buyer@example.com / DemoPassword123!');
    console.log('Seller: seller@example.com / DemoPassword123!');
    console.log('Admin:  admin@example.com / AdminPassword123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
