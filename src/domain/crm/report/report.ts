import { ID } from "shared/id.ts";

export class Report {
  readonly patientId: ID;
  readonly stateOfConsciousness: string[];

  constructor(patientId: ID, statusOfConsciousness: string[]) {
    this.patientId = patientId;
    this.stateOfConsciousness = [...statusOfConsciousness];
  }
}
