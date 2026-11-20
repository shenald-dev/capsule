package main

import "fmt"

func calculateRisk(values []int) int {
	// Deliberate index out of range panic
	return values[5]
}

func main() {
	fmt.Println("Processing risk factors...")
	data := []int{10, 20, 30}
	calculateRisk(data)
}
