# 构建阶段
FROM golang:1.25-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY go.mod go.sum* ./
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# 运行阶段
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
