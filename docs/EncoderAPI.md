# Encoder API

## GET API

#### Get built-in encoder config
```
/encoder/config
```

#### Get encoder stats and queue
```
/encoder/stats
```

#### Get authenticated self-encoder details
```
/encoder/self/get?access_token=AUTH_TOKEN
```

#### Get all self-encoder details
```
/encoder/self/all
```

## POST API

#### Register self-encoder for new upload
```
/encoder/self/register?access_token=AUTH_TOKEN
```
* `duration` *(required)*: Duration of the video that has been encoded
* `outputs` *(required)*: Comma-separated list of outputs (without `p` suffix)

Example response:
```json
{"id": "x9bjl7dkqjt6t6f"}
```

#### Complete self-encode upload
```
/encoder/self/complete?access_token=AUTH_TOKEN
```

## DELETE API

#### Deregister self-encoder (cancel self-encode upload)
```
/encoder/self/deregister?access_token=AUTH_TOKEN
```