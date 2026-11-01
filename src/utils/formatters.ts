export const formatKgCO2 = (kg: number): string => `${kg.toFixed(2)} kg CO₂e`

export const isLowStock = (stock: number, threshold = 5): boolean => stock <= threshold
