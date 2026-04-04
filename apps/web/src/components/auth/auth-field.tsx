import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends Omit<React.ComponentProps<typeof Input>, "className"> {
  label: string;
  description?: string;
  error?: string;
}

export function AuthField({
  id,
  label,
  description,
  error,
  ...props
}: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        className="h-11 rounded-[1.25rem] bg-secondary/70"
        {...props}
      />
      {(error || description) && (
        <p
          className={cn(
            "min-h-5 text-sm",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? description}
        </p>
      )}
    </div>
  );
}
