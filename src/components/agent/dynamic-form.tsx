/**
 * 动态表单组件
 *
 * 根据表单配置动态渲染表单字段
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormConfig, FormField, formValuesToParams } from "@/lib/agent/form-configs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField as FormFieldUI,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DynamicFormProps {
  config: FormConfig;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * 根据表单配置生成 Zod Schema
 */
function generateZodSchema(config: FormConfig): z.ZodObject<any> {
  const schemaMap: Record<string, z.ZodTypeAny> = {};

  config.fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "textarea":
      case "text":
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
        } else {
          fieldSchema = fieldSchema.optional();
        }
        break;

      case "number":
        fieldSchema = z.coerce.number();
        if (field.min !== undefined) {
          fieldSchema = fieldSchema.min(field.min);
        }
        if (field.max !== undefined) {
          fieldSchema = fieldSchema.max(field.max);
        }
        if (!field.required) {
          fieldSchema = fieldSchema.optional();
        }
        break;

      case "select":
        fieldSchema = z.string();
        if (!field.required) {
          fieldSchema = fieldSchema.optional();
        }
        break;

      default:
        fieldSchema = z.any();
    }

    schemaMap[field.name] = fieldSchema;
  });

  return z.object(schemaMap);
}

/**
 * 渲染单个表单字段
 */
function renderFormField(field: FormField, form: any) {
  switch (field.type) {
    case "textarea":
      return (
        <FormFieldUI
          control={form.control}
          name={field.name}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={field.placeholder}
                  className="min-h-[100px]"
                  {...formField}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "number":
      return (
        <FormFieldUI
          control={form.control}
          name={field.name}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  {...formField}
                  onChange={(e) => formField.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "select":
      return (
        <FormFieldUI
          control={form.control}
          name={field.name}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`请选择${field.label}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "text":
    default:
      return (
        <FormFieldUI
          control={form.control}
          name={field.name}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Input placeholder={field.placeholder} {...formField} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
  }
}

export function DynamicForm({
  config,
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading = false,
}: DynamicFormProps) {
  const schema = generateZodSchema(config);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: config.fields.reduce((acc, field) => {
      acc[field.name] = initialValues[field.name] ?? field.defaultValue ?? "";
      return acc;
    }, {} as Record<string, any>),
  });

  const handleSubmit = (values: Record<string, any>) => {
    const params = formValuesToParams(config, values);
    onSubmit(params);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">{config.title}</CardTitle>
        {config.description && (
          <CardDescription>{config.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {config.fields.map((field) => (
              <div key={field.name}>{renderFormField(field, form)}</div>
            ))}

            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  取消
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] hover:from-[#16A34A] hover:to-[#87CEEB]"
              >
                {isLoading ? "创建中..." : "确认开始"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
