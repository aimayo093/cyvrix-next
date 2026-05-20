import { prisma } from "../lib/prisma";

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@cyvrix.co.uk" }
    });
    if (user) {
      console.log("Admin user found:", {
        id: user.id,
        email: user.email,
        role: user.role,
        active: user.active
      });
    } else {
      console.log("Admin user NOT found.");
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
