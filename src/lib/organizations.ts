export const organizationTypes = [
  { value: "school", label: "School" },
  { value: "estate", label: "Estate" },
  { value: "church", label: "Church" },
  { value: "ngo", label: "NGO" },
  { value: "cooperative", label: "Cooperative" },
  { value: "business", label: "Business" },
  { value: "association", label: "Association" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
] as const;

export type OrganizationType = (typeof organizationTypes)[number]["value"];

export type OrganizationInput = {
  name: string;
  organizationType: string;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

export type ValidOrganizationInput = {
  name: string;
  organizationType: OrganizationType;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
};

export type OrganizationValidationErrors = Partial<
  Record<keyof OrganizationInput, string>
>;

export type OrganizationValidationResult =
  | { ok: true; data: ValidOrganizationInput }
  | { ok: false; errors: OrganizationValidationErrors };

const organizationTypeValues = new Set<string>(
  organizationTypes.map((type) => type.value),
);

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getOrganizationTypeLabel(type: string) {
  return (
    organizationTypes.find(
      (organizationType) => organizationType.value === type,
    )?.label ?? "Other"
  );
}

export function validateOrganizationInput(
  input: OrganizationInput,
): OrganizationValidationResult {
  const errors: OrganizationValidationErrors = {};
  const name = input.name.trim();
  const organizationType = input.organizationType.trim();
  const email = normalizeOptionalText(input.email);
  const phone = normalizeOptionalText(input.phone);
  const logoUrl = normalizeOptionalText(input.logoUrl);

  if (name.length < 2) {
    errors.name = "Enter an organization name.";
  }

  if (!organizationTypeValues.has(organizationType)) {
    errors.organizationType = "Choose a valid organization type.";
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address or leave it blank.";
  }

  if (logoUrl) {
    try {
      const parsedUrl = new URL(logoUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        errors.logoUrl = "Logo URL must start with http or https.";
      }
    } catch {
      errors.logoUrl = "Enter a valid logo URL or leave it blank.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      organizationType: organizationType as OrganizationType,
      email,
      phone,
      logoUrl,
    },
  };
}
