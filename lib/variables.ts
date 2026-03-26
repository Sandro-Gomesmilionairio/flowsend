import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VariableContext {
  contact: {
    name: string;
    phone: string;
    email?: string | null;
    customFields?: Record<string, unknown>;
  };
  client: {
    name: string;
  };
}

export function replaceVariables(template: string, ctx: VariableContext): string {
  const now = new Date();
  const firstName = ctx.contact.name.split(" ")[0];

  const variables: Record<string, string> = {
    "{{name}}": ctx.contact.name,
    "{{first_name}}": firstName,
    "{{phone}}": ctx.contact.phone,
    "{{email}}": ctx.contact.email || "",
    "{{now}}": format(now, "dd/MM/yyyy HH:mm", { locale: ptBR }),
    "{{date}}": format(now, "dd/MM/yyyy", { locale: ptBR }),
    "{{doctor_name}}": ctx.client.name,
  };

  let result = template;

  // Replace standard variables
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(key, value);
  }

  // Replace custom field variables {{custom.field_name}}
  const customFields = ctx.contact.customFields || {};
  result = result.replace(/\{\{custom\.([^}]+)\}\}/g, (match, fieldName) => {
    const value = customFields[fieldName];
    if (value === undefined || value === null) return match;

    // Handle date formatting for date fields
    if (value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))) {
      try {
        return format(new Date(value as string), "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return String(value);
      }
    }

    return String(value);
  });

  return result;
}

export function resolveRelativeTime(
  from: string,
  duration: number,
  unit: "minutes" | "hours" | "days",
  customFields: Record<string, unknown>
): Date {
  let baseDate: Date;

  if (from.startsWith("{{custom.")) {
    const fieldName = from.slice(9, -2);
    const fieldValue = customFields[fieldName];
    if (fieldValue) {
      baseDate = new Date(fieldValue as string);
    } else {
      baseDate = new Date();
    }
  } else {
    baseDate = new Date();
  }

  const ms = durationToMs(duration, unit);
  return new Date(baseDate.getTime() + ms);
}

export function durationToMs(
  duration: number,
  unit: "minutes" | "hours" | "days"
): number {
  const MS = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return duration * MS[unit];
}
