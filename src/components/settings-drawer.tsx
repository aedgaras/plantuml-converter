"use client"

import { X } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Switch } from "@/src/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-800">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-medium">Settings</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <Tabs defaultValue="diagram">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="diagram">Diagram</TabsTrigger>
                <TabsTrigger value="openapi">OpenAPI</TabsTrigger>
                <TabsTrigger value="editor">Editor</TabsTrigger>
              </TabsList>

              <TabsContent value="diagram" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-generate">Auto-generate diagram</Label>
                  <Switch id="auto-generate" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagram-format">Diagram format</Label>
                  <Select defaultValue="svg">
                    <SelectTrigger id="diagram-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="svg">SVG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="openapi" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-convert">Auto-convert</Label>
                  <Switch id="auto-convert" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>Include in schema</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="examples" defaultChecked />
                      <Label htmlFor="examples">Examples</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="descriptions" defaultChecked />
                      <Label htmlFor="descriptions">Descriptions</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="editor" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Editor theme</Label>
                  <RadioGroup defaultValue="dark">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="light" />
                      <Label htmlFor="light">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="dark" />
                      <Label htmlFor="dark">Dark</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t p-6 dark:border-gray-700">
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onClose}>Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
