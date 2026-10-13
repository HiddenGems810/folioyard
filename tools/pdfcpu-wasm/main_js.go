//go:build js && wasm

package main

import (
	"errors"
	"syscall/js"
)

func main() {
	process := js.FuncOf(func(_ js.Value, args []js.Value) any {
		response := js.Global().Get("Object").New()
		if len(args) != 3 || args[0].Get("byteLength").Int() > maxInputBytes {
			response.Set("ok", false)
			if len(args) == 3 {
				response.Set("code", "too-large")
			} else {
				response.Set("code", "invalid-request")
			}
			return response
		}

		inputValue := args[0]
		input := make([]byte, inputValue.Get("byteLength").Int())
		if copied := js.CopyBytesToGo(input, inputValue); copied != len(input) {
			response.Set("ok", false)
			response.Set("code", "invalid-request")
			return response
		}

		output, pageCount, err := Process(input, args[1].String(), args[2].String())
		if err != nil {
			response.Set("ok", false)
			switch {
			case errors.Is(err, ErrInputTooLarge):
				response.Set("code", "too-large")
			case errors.Is(err, ErrInvalidPassword):
				response.Set("code", "invalid-password")
			default:
				response.Set("code", "operation-failed")
			}
			return response
		}

		outputValue := js.Global().Get("Uint8Array").New(len(output))
		js.CopyBytesToJS(outputValue, output)
		response.Set("ok", true)
		response.Set("bytes", outputValue)
		response.Set("pageCount", pageCount)
		return response
	})
	js.Global().Set("folioyardPdfcpuProcess", process)
	select {}
}
