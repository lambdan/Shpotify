import EventEmitter from "events";
import { Connection, createConnection, QueryResult } from "mysql2/promise";

export class mysqlClient {
  private user: string;
  private password: string;
  private host: string;
  private database: string;
  private connection: Connection | null;
  public eventEmitter: EventEmitter;

  constructor(
    database: string,
    host?: string,
    user?: string,
    password?: string
  ) {
    this.user = user || "root";
    this.password = password || "root";
    this.host = host || "localhost";
    this.database = database;
    this.eventEmitter = new EventEmitter();

    this.connection = null;
  }

  public async connect() {
    this.connection = await createConnection({
      user: this.user,
      password: this.password,
      host: this.host,
    });

    await this.query(`CREATE DATABASE IF NOT EXISTS \`${this.database}\``);
    await this.query(`USE \`${this.database}\``);
    console.log(`<DB ${this.database}> connected`);
    this.eventEmitter.emit("connected", this.database);
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

  public async query(sql: string, values: any[] = []): Promise<QueryResult> {
    console.log(`<DB ${this.database}>`, sql, values);
    const result = (await this.connection!.query(sql, values)) as QueryResult;
    return result;
  }
}
