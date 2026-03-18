package main
import (
	"fmt"
	"net/http"
)

func handler (w hhtp.ResponseWriter , r*http.request.Request)
{
	fmt.Fprint (w, "Hello Devops World ")
}

func main()
{
	http.HandleFunc("/", handler)
	http.ListenAndServe(":8080, nill")
}