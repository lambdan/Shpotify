import { Connection, createConnection, QueryResult } from "mysql2/promise";

export class shMysqlClient {
  private user: string;
  private password: string;
  private host: string;
  private connection: Connection | null;

  constructor(host?: string, user?: string, password?: string) {
    this.user = user || "root";
    this.password = password || "root";
    this.host = host || "localhost";

    this.connection = null;
    this.connect();
  }

  private async connect() {
    this.connection = await createConnection({
      user: this.user,
      password: this.password,
      host: this.host,
    });
  }

  public async databaseExists(dbName: string) {
    if (this.connection == null) {
      console.warn("Connection is null in databaseExists!");
      return;
    }
    const rows = await this.connection.query(`SHOW DATABASES LIKE ?`, [dbName]);
    const a = rows.at(0) as []; // TODO properly do this lol
    return a.length > 0;
  }

  public getConnection(): Connection | null {
    return this.connection;
  }

  public async query(sqlQuery: string, values: any[]) {
    console.log(sqlQuery, values);
    return await this.connection?.query(sqlQuery, values);
  }
}
