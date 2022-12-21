# SPK API

API methods for pinning videos uploaded to 3Speak centralized servers through IPFS network.

## GET API

#### Get pin statuses for user
```
/spk/pin/status?access_token=AUTH_TOKEN
```

#### Get pin status by ID belonging to user
```
/spk/pin/status/:id?access_token=AUTH_TOKEN
```

## POST API

#### Initiate a pin request
```
/spk/pin?access_token=AUTH_TOKEN
```