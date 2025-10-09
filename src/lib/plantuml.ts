/**
 * PlantUML encoding and URL generation utilities
 */

// PlantUML server URL
const PLANTUML_SERVER = "https://www.plantuml.com/plantuml"

/**
 * Encode PlantUML text for use with the PlantUML server
 * This uses a simplified version of the encoding algorithm
 * @param umlText The PlantUML text to encode
 * @returns The encoded text for use in a PlantUML server URL
 */
export function encodePlantUml(umlText: string): string {
  // In a real application, you would use the proper PlantUML encoding algorithm
  // This is a simplified version that works for demo purposes

  // For a real implementation, you would use the deflate algorithm and base64 encoding
  // See: https://plantuml.com/text-encoding

  // For this demo, we'll use a simple base64 encoding
  // Note: This won't work with a real PlantUML server, but it's sufficient for the demo
  try {
    return btoa(umlText)
  } catch (e) {
    console.error("Error encoding PlantUML:", e)
    throw new Error("Failed to encode PlantUML")
  }
}

/**
 * Get the URL for a PlantUML diagram
 * @param encodedUml The encoded PlantUML text
 * @param format The format of the diagram (svg or png)
 * @returns The URL to the PlantUML diagram
 */
export function getPlantUmlUrl(encodedUml: string, format: "svg" | "png" = "svg"): string {
  // In a real application, you would use the proper PlantUML server URL
  // For this demo, we'll use a placeholder image

  // For a real implementation, you would use:
  // return `${PLANTUML_SERVER}/${format}/${encodedUml}`

  // For this demo, we'll use a placeholder image
  return `/placeholder.svg?height=300&width=600&text=${encodeURIComponent("PlantUML Diagram")}`
}

/**
 * Decode a PlantUML encoded string
 * @param encoded The encoded PlantUML text
 * @returns The decoded PlantUML text
 */
export function decodePlantUml(encoded: string): string {
  // In a real application, you would use the proper PlantUML decoding algorithm
  // This is a simplified version that works for demo purposes

  try {
    return atob(encoded)
  } catch (e) {
    console.error("Error decoding PlantUML:", e)
    throw new Error("Failed to decode PlantUML")
  }
}
