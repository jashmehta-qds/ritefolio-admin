import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";

export interface CorporateActionType {
  Id: number;
  Code: string;
  Name: string;
  IsActive: boolean;
}

interface CorporateActionTypeSelectProps {
  types: CorporateActionType[];
  /** Currently selected type ID as a string, or "" for no selection */
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CorporateActionTypeSelect({
  types,
  selectedKey,
  onSelectionChange,
  label = "Corporate Action Type",
  placeholder,
  isRequired = false,
  size = "md",
}: CorporateActionTypeSelectProps) {
  return (
    <Select
      label={label}
      placeholder={placeholder}
      selectedKeys={selectedKey !== "" ? [selectedKey] : []}
      onSelectionChange={(keys) => {
        const val = (Array.from(keys)[0] as string) ?? "";
        onSelectionChange(val);
      }}
      isRequired={isRequired}
      size={size}
    >
      {types.map((type) => (
        <SelectItem
          key={type.Id.toString()}
          textValue={`${type.Code} - ${type.Name}`}
        >
          <div className="flex items-center gap-2">
            <Chip size="sm" variant="dot" color="primary" className="shrink-0">
              {type.Code}
            </Chip>
            <span>{type.Name}</span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}
