import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [t]: any = await conn.query("SHOW TABLES");
    console.log(t.map((o: any) => Object.values(o)[0]).join(", "));
  } catch(e: any) { }
  conn.end();
}
run();
