"use client";

import { DatePicker, DateField, Calendar, Label, FieldError } from "@heroui/react";
import { CalendarDate, parseDate, getLocalTimeZone, today } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  isRequired?: boolean;
  className?: string;
}

function toCalendarDate(iso: string): CalendarDate {
  if (!iso) return today(getLocalTimeZone());
  try {
    return parseDate(iso);
  } catch {
    return today(getLocalTimeZone());
  }
}

export function ChampDate({ label, value, onChange, isRequired, className }: Props) {
  return (
    <DatePicker
      isRequired={isRequired}
      value={toCalendarDate(value)}
      onChange={(d) => { if (d) onChange(d.toString()); }}
      className={className}
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth>
        <DateField.InputContainer>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.InputContainer>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator>
              <CalendarDays size={16} />
            </DatePicker.TriggerIndicator>
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <FieldError />
      <DatePicker.Popover className="!max-w-none w-auto min-w-[300px] p-3">
        <Calendar>
          <Calendar.Header>
            <Calendar.NavButton slot="previous">
              <ChevronLeft size={16} />
            </Calendar.NavButton>
            <Calendar.Heading />
            <Calendar.NavButton slot="next">
              <ChevronRight size={16} />
            </Calendar.NavButton>
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
