const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: ".env.local" });

const Authority = require("../models/Authority");
const Grievance = require("../models/Grievance");
const User = require("../models/User");

const AUTHORITY_PASSWORD = "authority123";

async function seed() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  await mongoose.connect(mongoUri);

  const authoritySeed = [
    {
      name: "Municipal Corporation Jalandhar",
      city: "Jalandhar",
      categoriesHandled: [
        "Sanitation & Garbage",
        "Parks & Green Areas",
        "Roads & Footpaths",
        "Street Lighting",
        "Other",
      ],
      contactInfo: { email: "mc.jalandhar@punjab.gov.in" },
      userEmail: "mc@jalandhar.gov.in",
    },
    {
      name: "PSPCL Jalandhar",
      city: "Jalandhar",
      categoriesHandled: ["Electricity"],
      contactInfo: { email: "pspcl.jal@punjab.gov.in" },
      userEmail: "pspcl@jalandhar.gov.in",
    },
    {
      name: "Water Supply & Sanitation Dept",
      city: "Jalandhar",
      categoriesHandled: ["Water Supply"],
      contactInfo: { email: "wss.jalandhar@punjab.gov.in" },
      userEmail: "water@jalandhar.gov.in",
    },
    {
      name: "PWD Jalandhar",
      city: "Jalandhar",
      categoriesHandled: ["Roads & Footpaths"],
      contactInfo: { email: "pwd.jalandhar@punjab.gov.in" },
      userEmail: "pwd@jalandhar.gov.in",
    },
  ];

  await Authority.deleteMany({ city: "Jalandhar" });

  const insertedAuthorities = await Authority.insertMany(
    authoritySeed.map((item) => ({
      name: item.name,
      city: item.city,
      categoriesHandled: item.categoriesHandled,
      contactInfo: item.contactInfo,
    }))
  );

  const passwordHash = await bcrypt.hash(AUTHORITY_PASSWORD, 10);

  for (const authority of insertedAuthorities) {
    const authorityMeta = authoritySeed.find((item) => item.name === authority.name);

    await User.findOneAndUpdate(
      { email: authorityMeta.userEmail },
      {
        name: authority.name,
        email: authorityMeta.userEmail,
        password: passwordHash,
        phone: "",
        role: "authority",
        city: "Jalandhar",
        authorityId: authority._id,
        authorityName: authority.name,
        isPhoneVerified: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const citizenPassword = await bcrypt.hash("citizen123", 10);
  const demoCitizen = await User.findOneAndUpdate(
    { email: "citizen.demo@jalandhar.in" },
    {
      name: "Demo Citizen",
      email: "citizen.demo@jalandhar.in",
      password: citizenPassword,
      phone: "9999999999",
      role: "citizen",
      city: "Jalandhar",
      isPhoneVerified: true,
      authorityId: null,
      authorityName: "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Grievance.deleteMany({ city: "Jalandhar", createdBy: demoCitizen._id });

  const authorityByCategory = {
    "Sanitation & Garbage": insertedAuthorities.find((a) => a.name === "Municipal Corporation Jalandhar"),
    "Parks & Green Areas": insertedAuthorities.find((a) => a.name === "Municipal Corporation Jalandhar"),
    "Roads & Footpaths": insertedAuthorities.find((a) => a.name === "PWD Jalandhar"),
    Electricity: insertedAuthorities.find((a) => a.name === "PSPCL Jalandhar"),
    "Water Supply": insertedAuthorities.find((a) => a.name === "Water Supply & Sanitation Dept"),
    "Street Lighting": insertedAuthorities.find((a) => a.name === "Municipal Corporation Jalandhar"),
    Other: insertedAuthorities.find((a) => a.name === "Municipal Corporation Jalandhar"),
  };

  const demoGrievances = [
    {
      title: "No water supply for 3 days in Model Town",
      description: "Water has not been supplied in our lane for the last three days and residents are struggling.",
      category: "Water Supply",
      city: "Jalandhar",
      location: "Model Town, Phase 2",
      supportCount: 142,
      status: "reported",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Broken streetlights on GT Road",
      description: "Streetlights are non-functional on a long stretch causing safety concerns at night.",
      category: "Street Lighting",
      city: "Jalandhar",
      location: "GT Road",
      supportCount: 87,
      status: "in_progress",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Garbage not collected near market area",
      description: "Garbage has piled up for over a week and is creating foul smell and hygiene risks.",
      category: "Sanitation & Garbage",
      city: "Jalandhar",
      location: "Basti Adda Market",
      supportCount: 203,
      status: "resolved",
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Large potholes on main road",
      description: "Deep potholes are causing frequent traffic jams and minor accidents.",
      category: "Roads & Footpaths",
      city: "Jalandhar",
      location: "Nakodar Road",
      supportCount: 240,
      status: "in_progress",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Public park lights and benches damaged",
      description: "The local park has damaged benches and no lighting, making it unsafe after sunset.",
      category: "Parks & Green Areas",
      city: "Jalandhar",
      location: "Urban Estate Park",
      supportCount: 10,
      status: "reported",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  await Grievance.insertMany(
    demoGrievances.map((item) => ({
      ...item,
      createdBy: demoCitizen._id,
      assignedAuthority: authorityByCategory[item.category]?._id || null,
      supporters: [],
      statusHistory: [
        {
          status: item.status,
          note: "Seeded sample grievance",
          updatedAt: item.createdAt,
          updatedBy: demoCitizen._id,
        },
      ],
    }))
  );

  console.log("Seed complete");
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  });
