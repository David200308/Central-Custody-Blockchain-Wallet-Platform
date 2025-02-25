FROM golang:1.22-alpine3.19 as build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -o /key-service

FROM alpine:3.19 
COPY --from=build /key-service /key-service

ENV PORT=8080
EXPOSE 8080

CMD ["/key-service"]
