# Signature-Based Authentication

The new `/loginsig` POST API method introduced in v3.0 supersedes the previous `/login` and `/logincb` methods. This document describes the construction of the signed message used for authentication.

## Complete payload example:
```
techcoderx:oneloveipfs_login:hive:70852842:043920ea4796055a699e0b15f057211b63dd27be:202c53fa886caaf7d25a80fe544b2bdd1d8891ca8459662345680e55b11a4c715324ebc77e63fa8ef50f9e1f3bad9b174465510a09a9ecff6bccb5955f04d11ba6
```

## Construction

The payload consists of 6 parts separated by colons (`:`).

### Section 1: Username

The username to be authenticated. In the example above, it is `techcoderx`.

### Section 2: Auth Identifier

The unique identifier for each instance, this is to ensure the same access token will not work on different upload endpoints. This may be obtained from `config.authIdentifier`, which can also be obtained from `/config` GET API call.

In the example above, it is `oneloveipfs_login`.

### Section 3: Network

The network to be authenticated. Allowed values are `hive` and `avalon`.

In the example above, it is `hive`.

#### Section 4: Recent Block Number

The most recent block number of the blockchain network. Only blocks as recent as `config.authTimeoutBlocks` old are accepted. In the example above, it is [70852842](https://hiveblocks.com/b/70852842).

#### Section 5: Block ID/Hash of the Recent Block Number

The block ID or hash of the block number in the previous section. In the example above, the block ID of the said block was `043920ea4796055a699e0b15f057211b63dd27be`.

#### Section 6: Signature

The graphene formatted signature of all of the above sections, as a string.

The message to sign for the example above is:
```
techcoderx:oneloveipfs_login:hive:70852842:043920ea4796055a699e0b15f057211b63dd27be
```

The resulting signature would be `202c53fa886caaf7d25a80fe544b2bdd1d8891ca8459662345680e55b11a4c715324ebc77e63fa8ef50f9e1f3bad9b174465510a09a9ecff6bccb5955f04d11ba6` created using the private posting key (with public key `STM6QYiEbivKit1Zziega4xeJMSjuHuYTcis7dfLP5RuFoXh6aoiG`) of the account `techcoderx`.

Join the strings from the above parts in the correct order to obtain the payload needed to call `/loginsig`.