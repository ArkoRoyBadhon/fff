const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  storeName: { type: String, required: true },
  storeLogo: { type: String },
  coverImage: { type: String },
  companyWebsite: { type: String },
  preferredLanguage: { type: String, required: true },
  storeDescription: { type: String },
  abbfMembership: { type: String, required: true },
  businessEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },

  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },

  contactPerson: {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
  },
  legalStatus: { type: String, required: true },
  natureOfBusiness: { type: String, required: true },
  businessSector: { type: String, required: true },
  certifications: { type: String, required: true },
  businessDetails: {
    businessRegistration: { type: String },
    taxId: { type: String },
    proofOfAddress: { type: String },
    ownerIdentification: { type: String },
    additionalDocuments: [{ name: String, file: String }],
  },
  bankDetails: {
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    swiftCode: { type: String, required: true },
    currency: { type: String, required: true },
    isPrimary: { type: String, required: true },
  },
  paymentTerms: {
    upfront: { type: String, required: true },
    onDelivery: { type: String, required: true },
    acceptedCurrencies: [String],
    customTerms: [{ days: String, percentage: String }],
    formattedTerms: { type: String },
  },
  shipping: {
    regions: [String],
    carriers: [String],
  },
  policies: {
    terms: { type: Boolean, required: true },
    privacy: { type: Boolean, required: true },
    conditions: { type: Boolean, required: true },
    authentic: { type: Boolean, required: true },
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReasons: [
    {
      field: { type: String },
      reason: { type: String },
    },
  ],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Store", storeSchema);
