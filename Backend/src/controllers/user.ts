import { Body, Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { UserServices } from '../services/user';
import { Response, Request } from 'express';
import { generateAuthenticationOptions, generateRegistrationOptions, VerifiedAuthenticationResponse, verifyAuthenticationResponse, VerifyAuthenticationResponseOpts, verifyRegistrationResponse } from '@simplewebauthn/server';
import { JwtPayload } from 'jsonwebtoken';
import {
    CreatePasskeyRequestBodySchema,
    SignUpSchema,
} from '../schemas/user';
import {
    generateToken,
    verifyToken,
    validateEmail,
    generateUuid,
    rpName,
    rpID,
    origin,
    intToUint8Array,
    uint8ArrayToBase64,
    sqliCheck
} from '../utils/auth';
import { AuthenticationResponseJSON } from '@simplewebauthn/server';

@Controller("user")
export class UserController {
    constructor(private readonly userService: UserServices) { }

    // Get user info
    @Get()
    async getUser(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const token = request.cookies?.token;
        if (!token) {
            response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Unauthorized',
            });
            return;
        }

        const payload: JwtPayload = await verifyToken(token).catch((err) => {
            console.error('Token verification failed:', err);
            throw new Error('Unauthorized');
        });

        if (typeof payload !== "object" || !(typeof payload.aud === 'string')) {
            response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Unauthorized'
            });
            return;
        }

        const data = await this.userService.getUserById(parseInt(payload.aud, 10));
        if (!data) {
            response.status(HttpStatus.NOT_FOUND).json({
                message: 'User not found',
            });
            return;
        }
        
        response.status(HttpStatus.OK).json(data);
    }

    // Password register
    @Post('register')
    async createUser(@Body() data: SignUpSchema, @Res({ passthrough: true }) response: Response) {
        if (!data.email) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Email is required'
            });
            return;
        }
        if (!validateEmail(data.email)) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Invalid email'
            });
            return;
        }

        try {
            const result = await this.userService.createUser(data);
            if (!result) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Register failed'
                });
                return;
            }
        } catch (error) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Register failed'
            });
            return;
        }

        const payload = {
            email: data.email,
            usage: 'registration in progress'
        };

        const token = generateToken(payload, false);

        response.cookie('token', token, { secure: true, httpOnly: true, sameSite: 'strict' });

        response.status(HttpStatus.OK).json({
            message: 'Register successful'
        });
    }

    // token verification
    @Post('token')
    async verifyTokenC(@Body() data: { type: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        try {
            const token = request.cookies?.token;
            if (!token) {
                response.status(HttpStatus.UNAUTHORIZED).json({
                    message: 'Unauthorized: No token provided',
                });
                return;
            }

            if (data.type !== 'token') {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Invalid or missing request type',
                });
                return;
            }

            let payload: JwtPayload;
            try {
                payload = await verifyToken(token);
            } catch (err) {
                console.error('Token verification failed:', err.message);
                const statusCode = err.message === 'Token has expired' ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;

                response.clearCookie('token');
                response.status(statusCode).json({
                    message: 'Unauthorized: Invalid token',
                    error: err.message,
                });
                return;
            }

            if (typeof payload !== 'object' || payload.usage || typeof payload.aud !== 'string') {
                if (payload.usage) {
                    response.status(HttpStatus.BAD_REQUEST).json({
                        message: 'Invalid token usage or payload',
                        usage: payload.usage,
                    });
                } else {
                    response.clearCookie('token');
                    response.status(HttpStatus.UNAUTHORIZED).json({
                        message: 'Unauthorized: Invalid token payload',
                    });
                }
                return;
            }
            
            const user = await this.userService.getUserById(parseInt(payload.aud, 10));
            if (!user) {
                response.clearCookie('token');
                response.status(HttpStatus.NOT_FOUND).json({
                    message: 'User not found',
                });
                return;
            }

            response.status(HttpStatus.OK).json({
                message: 'Token is valid',
                isValid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    passkeyEnabled: user.passkeyEnabled,
                },
            });
        } catch (error) {
            console.error('Error in verifyTokenC:', error.message);
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Internal server error',
            });
        }
    }


    // Logs
    @Get('logs')
    async getLogs(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const token = request.cookies?.token;
        if (!token) {
            response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Unauthorized',
            });
            return;
        }

        const payload: JwtPayload = await verifyToken(token).catch((err) => {
            console.error('Token verification failed:', err);
            throw new Error('Unauthorized');
        });

        if (typeof payload !== "object" || !(typeof payload.aud === 'string')) {
            response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Unauthorized'
            });
            return;
        }

        const data = await this.userService.getLogsByUserId(parseInt(payload.aud)).catch((err) => {
            console.log(err);
            response.status(HttpStatus.NOT_FOUND).json({
                message: 'User not found'
            });
            return;
        });

        response.status(HttpStatus.OK).json(data);
    }

    // Passkey login
    @Post('request/passkey/enable')
    async requestPasskeyEnable(@Body() data: { rPasskey: boolean }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        try {
            const token = request.cookies?.token;

            if (!token) {
                response.status(HttpStatus.UNAUTHORIZED).json({
                    message: 'Unauthorized'
                });
                return;
            }

            let payload: JwtPayload;

            try {
                payload = await verifyToken(token);
            } catch (error) {
                console.error('Token verification failed:', error.message);
                const statusCode = error.message === 'Token has expired' ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;
                response.status(statusCode).json({
                    message: error.message
                });
                return;
            }

            if (payload.usage !== 'registration in progress') {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Invalid token usage'
                });
                return;
            }

            if (typeof data.rPasskey !== 'boolean') {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Request passkey is required'
                });
                return;
            }

            const user = await this.userService.getUserByEmailWherePasskeyDisabled(payload.email);

            if (!user) {
                response
                    .status(HttpStatus.NOT_FOUND)
                    .json({
                        message: 'User not found or passkey already enabled'
                    });
                return;
            }

            const passkeyOptions = await generateRegistrationOptions({
                rpName: rpName(),
                rpID: rpID(),
                userID: intToUint8Array(user.id),
                userName: user.email,
                timeout: 60000,
                attestationType: 'direct',
                excludeCredentials: [],
                authenticatorSelection: {
                    residentKey: 'preferred',
                },
                supportedAlgorithmIDs: [-7, -257],
            });

            if (!passkeyOptions) {
                response
                    .status(HttpStatus.BAD_REQUEST)
                    .json({ message: 'Request passkey failed', status: false });
                return;
            }

            response.status(HttpStatus.OK).json({
                message: 'Request passkey successful',
                status: true,
                passkeyOptions,
                challenge: passkeyOptions.challenge,
            });
        } catch (err) {
            console.error('Error processing request:', err);
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Internal server error',
            });
        }
    }


    @Post('request/passkey/enroll')
    async requestPasskeyEnroll(@Body() data: CreatePasskeyRequestBodySchema, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        try {
            const token = request.cookies?.token;

            if (!token) {
                response.status(HttpStatus.UNAUTHORIZED).json({
                    message: 'Unauthorized'
                });
                return;
            }

            let payload: JwtPayload;

            try {
                payload = await verifyToken(token);
            } catch (error) {
                console.error('Token verification failed:', error.message);
                const statusCode = error.message === 'Token has expired' ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;
                response.status(statusCode).json({
                    message: error.message
                });
                return;
            }

            if (payload.usage !== 'registration in progress') {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Invalid token usage'
                });
                return;
            }

            if (!data) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Missing body data'
                });
                return;
            }

            const user = await this.userService.getUserByEmailWherePasskeyDisabled(payload.email);
            if (!user) {
                response
                    .status(HttpStatus.NOT_FOUND)
                    .json({
                        message: 'User not found or passkey already enabled'
                    });
                return;
            }

            const verification = await verifyRegistrationResponse({
                response: data.passkeyOptions,
                expectedChallenge: data.challenge,
                expectedOrigin: origin(),
                expectedRPID: rpID(),
                requireUserVerification: true,
            });

            if (!verification.verified || !verification.registrationInfo) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Verification failed',
                    verified: false,
                });
                return;
            }

            const { credential } = verification.registrationInfo;
            const createPasskeyData = {
                user_id: user.id,
                passkey_uid: credential.id,
                public_key: uint8ArrayToBase64(credential.publicKey),
                counter: credential.counter,
                transports: credential.transports.join(','),
            };

            const passkeyCreated = await this.userService.createPasskey(createPasskeyData);
            if (!passkeyCreated) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Create passkey failed'
                });
                return;
            }

            const passkeyEnabled = await this.userService.enablePasskey(user.id);
            if (!passkeyEnabled) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Enable passkey failed'
                });
                return;
            }

            const logCreated = await this.userService.createLog({
                user_id: user.id,
                content: 'Passkey was enabled & created',
            });

            if (!logCreated) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Create log failed'
                });
                return;
            }

            const authuuid = generateUuid();
            const tokenAuth = generateToken(
                {
                    aud: user.id.toString(),
                    email: user.email,
                    authuuid
                },
                false
            );

            const createAuthRes = await this.userService.createAuthRecord({
                auth_uuid: authuuid,
                user_id: user.id,
                loginMethod: 'passkey',
            });

            if (!createAuthRes) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Create Auth Record failed'
                });
                return;
            }

            const createLogResult = await this.userService.createLog({
                user_id: user.id,
                content: `Login via passkey at ISO Time: ${new Date().toISOString()}`,
            });

            if (!createLogResult) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Create log failed'
                });
                return;
            }

            response.cookie('token', tokenAuth, { secure: true, httpOnly: true, sameSite: 'strict' });
            response.status(HttpStatus.OK).json({
                message: 'Create & Login successfully',
                verified: true,
            });
        } catch (err) {
            console.error('Error processing request:', err);
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Internal server error',
            });
        }
    }


    @Post('login/passkey/request')
    async loginByPasskeyRequest(@Body() data: { email: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        if (!data.email) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Email is required'
            });
            return;
        }
        const email = data.email;

        const passkeyOptions = await generateAuthenticationOptions({
            timeout: 60000,
            allowCredentials: [],
            userVerification: 'required',
            rpID: rpID(),
        });
        if (!passkeyOptions) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Request passkey failed',
                status: false
            });
            return;
        }

        const payload = {
            email,
            passkeyOptionsChallenge: passkeyOptions.challenge,
            usage: 'passkey login verification'
        };

        const token = generateToken(payload, true);
        response.cookie('token', token, { secure: true, httpOnly: true, sameSite: 'strict' });

        response.status(HttpStatus.OK).json({
            message: "Request passkey successful",
            status: true,
            passkeyOptions,
        });
    }

    @Post('login/passkey/verify')
    async loginByPasskeyVerify(@Body() data: AuthenticationResponseJSON, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        try {
            const token = request.cookies?.token;

            if (!token) {
                response.status(HttpStatus.UNAUTHORIZED).json({
                    message: 'Unauthorized'
                });
                return;
            }

            let payload: JwtPayload;

            try {
                payload = await verifyToken(token);
            } catch (err) {
                console.error('Token verification failed:', err.message);
                const statusCode = err.message === 'Token has expired' ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;
                response.status(statusCode).json({
                    message: err.message
                });
                return;
            }

            if (payload.usage !== 'passkey login verification') {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Invalid token usage'
                });
                return;
            }

            if (!data) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Missing body data'
                });
                return;
            }

            const user = await this.userService.getUserByEmail(payload.email);
            if (!user) {
                response.status(HttpStatus.NOT_FOUND).json({
                    message: 'User not found'
                });
                return;
            }

            const passkeyUid = data.id;
            const passkeyInfo = await this.userService.getPasskeyByPasskeyUid(passkeyUid);

            if (!passkeyInfo) {
                response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Passkey not found'
                });
                return;
            }

            const opts: VerifyAuthenticationResponseOpts = {
                response: data,
                expectedChallenge: payload.passkeyOptionsChallenge,
                expectedOrigin: origin(),
                expectedRPID: rpID(),
                credential: {
                    id: passkeyInfo.credentialID,
                    publicKey: passkeyInfo.credentialPublicKey,
                    counter: passkeyInfo.counter,
                    transports: passkeyInfo.transports,
                },
            };

            const verification = await verifyAuthenticationResponse(opts);
            if (!verification.verified) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Verification failed',
                    verified: false,
                });
                return;
            }

            const { authenticationInfo } = verification;
            await this.userService.updatePasskeyCounter(passkeyUid, authenticationInfo.newCounter);

            const authuuid = generateUuid();
            const tokenAuth = generateToken(
                {
                    aud: user.id.toString(),
                    email: user.email,
                    authuuid
                },
                false
            );

            const createAuthRes = await this.userService.createAuthRecord({
                auth_uuid: authuuid,
                user_id: user.id,
                loginMethod: 'passkey',
            });

            if (!createAuthRes) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Create Auth Record failed'
                });
                return;
            }

            const createLogResult = await this.userService.createLog({
                user_id: user.id,
                content: `Login via passkey at ISO Time: ${new Date().toISOString()}`,
            });

            if (!createLogResult) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Create log failed'
                });
                return;
            }

            response.cookie('token', tokenAuth, { secure: true, httpOnly: true, sameSite: 'strict' });
            response.status(HttpStatus.OK).json({
                message: 'Login successful',
                verified: true,
            });
        } catch (error) {
            console.error('Error in loginByPasskeyVerify:', error);
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Internal server error',
            });
        }
    }


    @Post('/logout')
    async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const token = request.cookies?.token;
        if (!token) {
            response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Unauthorized',
            });
            return;
        }

        const payload: JwtPayload = await verifyToken(token).catch((err) => {
            console.error('Token verification failed:', err);
            throw new Error('Unauthorized');
        });

        if (typeof payload !== "object" || !(typeof payload.aud === 'string')) {
            response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Unauthorized'
            });
            return;
        }

        const result = await this.userService.createLog({
            user_id: parseInt(payload.aud),
            content: `Logout at ISO Time: ${new Date().toISOString()}`
        });

        if (!result) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Create log failed'
            });
            return;
        }

        response.clearCookie('token');
        response.status(HttpStatus.OK).json({
            message: 'Logout successful'
        });
    }

}
