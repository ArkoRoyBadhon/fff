const LandingPage = require("../models/LandingPage");

const initializeSections = async () => {
  const sections = [
    {
      sectionType: "hero",
      data: {
        title1: "Welcome to Our Platform",
        title2: "Build amazing experiences",
        features: ["Verified Suppliers", "Secure Payments", "Fast Delivery"],
        ctaButton1Text: "Get Started",
        ctaButton2Text: "Learn More",
        image: "/images/default-hero.jpg",
      },
    },
    {
      sectionType: "join",
      data: {
        title: "Join Our Community",
        subtitle: "Become part of our growing network of businesses",
        buttonText: "Sign Up Now",
        buttonLink: "/register",
        backgroundImage: "/images/join-bg.jpg",
      },
    },
    {
      sectionType: "howWork",
      data: {
        title: "How It Works",
        videoUrl: "https://youtube.com/embed/example",
        thumbnailUrl: "/images/how-work-thumbnail.jpg",
        steps: [
          {
            icon: "/images/step1-icon.png",
            title: "Register Your Account",
            description: "Create your free account in just 2 minutes",
          },
          {
            icon: "/images/step2-icon.png",
            title: "Browse Products",
            description:
              "Explore thousands of products from verified suppliers",
          },
          {
            icon: "/images/step3-icon.png",
            title: "Place Your Order",
            description: "Complete your purchase with secure payment options",
          },
        ],
      },
    },
    {
      sectionType: "import",
      data: {
        highlightText: "Global Sourcing",
        title2: "Import from Trusted Suppliers Worldwide",
        backgroundImage: "/images/import-bg.jpg",
        featuredImage: "/images/import-featured.jpg",
        countriesToShow: 5,
        startFromCountry: 1,
      },
    },
    {
      sectionType: "discover",
      data: {
        title: "Discover Our Marketplace",
        stats: {
          countries: {
            count: "50+",
            label: "Countries",
          },
          consumers: {
            count: "1M+",
            label: "Active Buyers",
          },
        },
        categories: [
          {
            id: "cat1",
            name: "Electronics",
            image: "/images/electronics.jpg",
            link: "/categories/electronics",
          },
          {
            id: "cat2",
            name: "Home & Garden",
            image: "/images/home-garden.jpg",
            link: "/categories/home-garden",
          },
        ],
      },
    },
    {
      sectionType: "expandMarket",
      data: {
        title: "Expand Your Market Reach",
        subtitle: "Connect with buyers from around the world",
        buttonText: "Start Selling",
        buttonLink: "/seller-registration",
        backgroundImage: "/images/expand-market-bg.jpg",
      },
    },
    {
      sectionType: "contact",
      data: {
        title: "Contact Us",
        subtitle: "We're here to help",
        description: "Have questions? Our team is ready to assist you",
        email: "support@yourplatform.com",
        phone: "+1 (555) 123-4567",
        whatsappText: "Chat on WhatsApp",
        backgroundImage: "/images/contact-bg.jpg",
      },
    },
    {
      sectionType: "partners",
      data: {
        title: "Our Trusted Partners",
        animationDuration: 20,
        images: [
          "/images/partner1.png",
          "/images/partner2.png",
          "/images/partner3.png",
        ],
      },
    },
  ];

  try {
    for (const section of sections) {
      const exists = await LandingPage.exists({
        sectionType: section.sectionType,
      });
      if (!exists) {
        await LandingPage.create(section);
        console.log(`Created default ${section.sectionType} section`);
      }
    }
    console.log("Landing page sections initialized successfully");
  } catch (err) {
    console.error("Error initializing landing page sections:", err);
  }
};

exports.getAllSections = async (req, res) => {
  try {
    const sections = await LandingPage.find().lean();
    const formattedSections = sections.reduce((acc, section) => {
      acc[section.sectionType] = section.data;
      return acc;
    }, {});

    res.json({
      success: true,
      data: formattedSections,
    });
  } catch (err) {
    console.error("Error fetching sections:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch landing page sections",
      error: err.message,
    });
  }
};

exports.getSection = async (req, res) => {
  try {
    const section = await LandingPage.findOne({
      sectionType: req.params.sectionType,
    }).lean();

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.json({
      success: true,
      data: section.data,
    });
  } catch (err) {
    console.error(`Error fetching ${req.params.sectionType} section:`, err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch section",
      error: err.message,
    });
  }
};

// exports.updateSection = async (req, res) => {
//   try {
//     const validSections = [
//       "hero",
//       "join",
//       "howWork",
//       "import",
//       "discover",
//       "expandMarket",
//       "contact",
//       "partners",
//     ];

//     if (!validSections.includes(req.params.sectionType)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid section type",
//       });
//     }

//     if (req.params.sectionType === "howWork" && req.body.steps) {
//       if (!Array.isArray(req.body.steps)) {
//         return res.status(400).json({
//           success: false,
//           message: "Steps must be an array",
//         });
//       }
//     }

//     if (req.params.sectionType === "discover" && req.body.categories) {
//       if (!Array.isArray(req.body.categories)) {
//         return res.status(400).json({
//           success: false,
//           message: "Categories must be an array",
//         });
//       }
//     }

//     if (req.params.sectionType === "partners" && req.body.animationDuration) {
//       if (
//         typeof req.body.animationDuration !== "number" ||
//         req.body.animationDuration <= 0
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "Animation duration must be a positive number",
//         });
//       }
//     }

//     const section = await LandingPage.findOneAndUpdate(
//       { sectionType: req.params.sectionType },
//       { $set: { data: req.body } },
//       {
//         new: true,
//         runValidators: true,
//         upsert: true,
//       }
//     );

//     res.json({
//       success: true,
//       message: "Section updated successfully",
//       data: section.data,
//     });
//   } catch (err) {
//     console.error(`Error updating ${req.params.sectionType} section:`, err);
//     res.status(400).json({
//       success: false,
//       message: "Failed to update section",
//       error: err.message,
//     });
//   }
// };

exports.updateSection = async (req, res) => {
  try {
    const validSections = [
      "hero",
      "join",
      "howWork",
      "import",
      "discover",
      "expandMarket",
      "contact",
      "partners",
    ];

    if (!validSections.includes(req.params.sectionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section type",
      });
    }

    // Process howWork section specially
    if (req.params.sectionType === "howWork") {
      if (req.body.steps && !Array.isArray(req.body.steps)) {
        return res.status(400).json({
          success: false,
          message: "Steps must be an array",
        });
      }

      // Extract step icons from root level and add them to steps array
      const processedData = { ...req.body };
      if (req.body.steps) {
        processedData.steps = req.body.steps.map((step, index) => {
          const stepIconKey = `steps[${index}].icon`;
          return {
            ...step,
            icon: req.body[stepIconKey] || step.icon,
          };
        });

        // Remove the temporary step icon fields from root
        Object.keys(processedData).forEach((key) => {
          if (key.startsWith("steps[") && key.endsWith("].icon")) {
            delete processedData[key];
          }
        });
      }

      const section = await LandingPage.findOneAndUpdate(
        { sectionType: req.params.sectionType },
        { $set: { data: processedData } },
        {
          new: true,
          runValidators: true,
          upsert: true,
        }
      );

      return res.json({
        success: true,
        message: "Section updated successfully",
        data: section.data,
      });
    }

    // Handle other section types normally
    const section = await LandingPage.findOneAndUpdate(
      { sectionType: req.params.sectionType },
      { $set: { data: req.body } },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    res.json({
      success: true,
      message: "Section updated successfully",
      data: section.data,
    });
  } catch (err) {
    console.error(`Error updating ${req.params.sectionType} section:`, err);
    res.status(400).json({
      success: false,
      message: "Failed to update section",
      error: err.message,
    });
  }
};

initializeSections().catch((err) => {
  console.error("Initialization error:", err);
  process.exit(1);
});

exports.resetToDefault = async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({
      success: false,
      message: "This action is only allowed in development mode",
    });
  }

  try {
    await LandingPage.deleteMany({});
    await initializeSections();

    res.json({
      success: true,
      message: "All sections reset to default",
    });
  } catch (err) {
    console.error("Error resetting sections:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reset sections",
      error: err.message,
    });
  }
};

module.exports.initializeSections = initializeSections;
