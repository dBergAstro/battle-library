import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  allLabel?: string;
  className?: string;
  "data-testid"?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  allLabel = "Все",
  className = "",
  "data-testid": testId,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const isAllSelected = selected.length === 0;

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (isAllSelected) return allLabel;
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} выбрано`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`justify-between min-w-[120px] ${className}`}
          data-testid={testId}
        >
          <span className="truncate text-sm">{getDisplayText()}</span>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-1">
            <div
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
              onClick={handleSelectAll}
              data-testid={`${testId}-option-all`}
            >
              <Checkbox
                checked={isAllSelected}
                data-testid={`${testId}-checkbox-all`}
              />
              <Label className="cursor-pointer text-sm font-medium">{allLabel}</Label>
            </div>
            
            <div className="h-px bg-border my-1" />
            
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => handleToggle(option.value)}
                data-testid={`${testId}-option-${option.value}`}
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  data-testid={`${testId}-checkbox-${option.value}`}
                />
                <Label className="cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {selected.length > 0 && (
          <div className="border-t p-2">
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={handleSelectAll}
              data-testid={`${testId}-clear`}
            >
              <X className="h-3 w-3 mr-1" />
              Сбросить
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
