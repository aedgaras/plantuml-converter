"use client"

import { X } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { CardFooter } from "@/src/components/ui/card"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Separator } from "@/src/components/ui/separator"
import { Switch } from "@/src/components/ui/switch"

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="absolute right-0 top-[57px] z-50 h-[calc(100vh-57px)] w-80 border-l bg-background p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      <Separator className="my-4" />

      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Diagram Settings</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-generate">Auto-generate diagram</Label>
              <Switch id="auto-generate" defaultChecked />
            </div>
            <div className="space-y-1">
              <Label htmlFor="diagram-format">Diagram format</Label>
              <Select defaultValue="svg">
                <SelectTrigger id="diagram-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="svg">SVG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="eps">EPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">OpenAPI Settings</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-convert">Auto-convert to OpenAPI</Label>
              <Switch id="auto-convert" defaultChecked />
            </div>
            <div className="space-y-1">
              <Label htmlFor="openapi-version">OpenAPI version</Label>
              <Select defaultValue="3.0.0">
                <SelectTrigger id="openapi-version">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3.0.0">3.0.0</SelectItem>
                  <SelectItem value="3.1.0">3.1.0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Include in schema</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-examples" defaultChecked />
                  <Label htmlFor="include-examples">Examples</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-descriptions" defaultChecked />
                  <Label htmlFor="include-descriptions">Descriptions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-validations" defaultChecked />
                  <Label htmlFor="include-validations">Validations</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Editor Settings</h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="theme">Editor theme</Label>
              <RadioGroup defaultValue="light" id="theme">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="theme-light" />
                  <Label htmlFor="theme-light">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" />
                  <Label htmlFor="theme-dark">Dark</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="theme-system" />
                  <Label htmlFor="theme-system">System</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label htmlFor="font-size">Font size</Label>
              <Select defaultValue="14">
                <SelectTrigger id="font-size">
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12px</SelectItem>
                  <SelectItem value="14">14px</SelectItem>
                  <SelectItem value="16">16px</SelectItem>
                  <SelectItem value="18">18px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <CardFooter className="mt-6 flex justify-end gap-2 px-0">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </div>
  )
}
