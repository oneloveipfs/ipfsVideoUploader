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
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

#### Get all self-encoder details
```
/encoder/self/all
```

## POST API

#### Register self-encoder for new upload
```
/encoder/self/register
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.
* `duration` *(required)*: Duration of the video that has been encoded
* `outputs` *(required)*: Comma-separated list of outputs (without `p` suffix)

Example response:
```json
{"id": "x9bjl7dkqjt6t6f"}
```

#### Complete self-encode upload
```
/encoder/self/complete
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

## DELETE API

#### Deregister self-encoder (cancel self-encode upload)
```
/encoder/self/deregister
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.