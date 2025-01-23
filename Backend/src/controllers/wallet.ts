import { Body, Controller, Get, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { WalletServices } from '../services/wallet';
import { Response, Request } from 'express';
import { UserServices } from '../services/user';
import { JwtPayload } from 'jsonwebtoken';
import { verifyToken } from '../utils/auth';
import { RequestSignSchema } from '../schemas/wallet';
import { isPolygonAddress } from '../utils/wallet';

@Controller("wallet")
export class WalletController {
    constructor(
        private readonly walletService: WalletServices,
        private readonly userService: UserServices
    ) { }

    @Get()
    async getWalletAddress(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
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
        try { 
            const wallet = await this.walletService.getWalletByUserId(data.id);
            response.status(HttpStatus.OK).json({
                success: true,
                walletAddress: wallet,
            });
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch gas fee',
            });
        }
    }

    @Post("create")
    async createWallet(@Req() req: Request, @Res() res: Response) { }

    @Post("sign/:mode")
    async createSign(@Param('mode') mode: string, @Body() bodyData: RequestSignSchema, @Req() request: Request, @Res({ passthrough: true }) response: Response) { 
        if (!mode || (mode !== 'message' && mode !== 'transaction')) {
            response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Invalid mode',
            });
            return;
        }

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

        try { 
            switch (mode) {
                case 'message':
                    if ('message' in bodyData) {
                        const message = {
                            "operation": "sign_message",
                            "message_payload": bodyData.message
                        }
                        
                        const signature = await this.walletService.signMessage(data.id, message);
                        response.status(HttpStatus.OK).json({
                            success: true,
                            signature,
                        });
                    } else {
                        response.status(HttpStatus.BAD_REQUEST).json({
                            message: 'Invalid body for sign message',
                        });
                        return;
                    }
                    
                    break;
                case 'transaction':
                    if (
                        'to' in bodyData && 
                        'value' in bodyData && 
                        'nonce' in bodyData && 
                        'type' in bodyData && 
                        'chainId' in bodyData && 
                        'gas' in bodyData && 
                        'maxFeePerGas' in bodyData && 
                        'maxPriorityFeePerGas' in bodyData &&
                        isPolygonAddress(bodyData.to)
                    ) {
                        const transaction = {
                            "operation": "sign_transaction",
                            "transaction_payload": bodyData
                        }

                        const txSignature = await this.walletService.signTransaction(data.id, transaction);
                        response.status(HttpStatus.OK).json({
                            success: true,
                            signature: txSignature,
                        });
                    } else {
                        response.status(HttpStatus.BAD_REQUEST).json({
                            message: 'Invalid body for sign transaction',
                        });
                        return;
                    }
                    break;
                default:
                    response.status(HttpStatus.BAD_REQUEST).json({
                        message: 'Invalid mode',
                    });
                    break;
            }
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to sign',
            });
        }
    }

}
