import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateClassDates } from "./dates.js";

describe("generateClassDates", () => {
  test("generates the correct number of Tuesdays in a 4-week span", () => {
    const dates = generateClassDates({
      seasonStart: "2026-09-01",   // Tuesday
      seasonEnd: "2026-09-22",     // Tuesday — 4 Tuesdays total
      dayOfWeek: "tuesday",
      startTime: "16:00",
      endTime: "17:00",
    });

    assert.equal(dates.length, 4, "should produce 4 Tuesday class dates");
    assert.equal(dates[0]!.class_date, "2026-09-01");
    assert.equal(dates[3]!.class_date, "2026-09-22");
  });

  test("all dates fall on the correct weekday", () => {
    const dates = generateClassDates({
      seasonStart: "2026-09-01",
      seasonEnd: "2026-11-30",
      dayOfWeek: "saturday",
      startTime: "10:00",
      endTime: "11:00",
    });

    for (const row of dates) {
      const d = new Date(`${row.class_date}T12:00:00`);
      assert.equal(
        d.getDay(),
        6,
        `Expected Saturday (6), got day ${d.getDay()} for ${row.class_date}`
      );
    }
  });

  test("start and end times are passed through unchanged", () => {
    const dates = generateClassDates({
      seasonStart: "2026-09-01",
      seasonEnd: "2026-09-01",
      dayOfWeek: "tuesday",
      startTime: "14:30",
      endTime: "15:15",
    });

    assert.equal(dates.length, 1);
    assert.equal(dates[0]!.start_time, "14:30");
    assert.equal(dates[0]!.end_time, "15:15");
  });

  test("returns empty array when seasonEnd is before first matching day", () => {
    const dates = generateClassDates({
      seasonStart: "2026-09-01",  // Tuesday
      seasonEnd: "2026-08-31",    // before start
      dayOfWeek: "tuesday",
      startTime: "16:00",
      endTime: "17:00",
    });

    assert.equal(dates.length, 0, "should return empty array");
  });

  test("advances to first matching weekday when seasonStart is not the target day", () => {
    // seasonStart is Monday 2026-09-07; first Wednesday is 2026-09-09
    const dates = generateClassDates({
      seasonStart: "2026-09-07",
      seasonEnd: "2026-09-23",
      dayOfWeek: "wednesday",
      startTime: "09:00",
      endTime: "10:00",
    });

    assert.equal(dates[0]!.class_date, "2026-09-09", "first class should be the first Wednesday on or after start");
  });

  test("throws on invalid dayOfWeek", () => {
    assert.throws(
      () =>
        generateClassDates({
          seasonStart: "2026-09-01",
          seasonEnd: "2026-09-30",
          dayOfWeek: "funday",
          startTime: "10:00",
          endTime: "11:00",
        }),
      /Invalid dayOfWeek/
    );
  });
});
