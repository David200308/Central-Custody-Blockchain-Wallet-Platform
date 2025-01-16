import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { request, response, Response } from 'express';
import { BlockchainServices } from '../services/blockchain';
import { UserServices } from '../services/user';
import { JwtPayload } from 'jsonwebtoken';
import { verifyToken } from '../utils/auth';

@Controller('blockchain')
export class BlockchainController {
    constructor(
        private readonly blockchainService: BlockchainServices, 
        private readonly userService: UserServices
    ) { }

    @Get('gas')
    async getGas(@Query('chainId') chainId: string, @Res() res: Response) {
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
            const chainIdNumber = parseInt(chainId, 10);

            if (isNaN(chainIdNumber)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid chainId. Please provide a valid number.',
                });
            }

            const gasFee = await this.blockchainService.getChainGas(chainIdNumber);

            return res.status(HttpStatus.OK).json({
                success: true,
                chainId: chainIdNumber,
                gasFee,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch gas fee',
            });
        }
    }
}
