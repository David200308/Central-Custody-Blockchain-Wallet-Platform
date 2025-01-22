import { Body, Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { WalletServices } from '../services/wallet';
import { Response, Request } from 'express';
import { UserServices } from '../services/user';
import { JwtPayload } from 'jsonwebtoken';
import { verifyToken } from '../utils/auth';

@Controller("wallet")
export class WalletController {
    constructor(
        private readonly walletService: WalletServices,
        private readonly userService: UserServices
    ) { }

    @Get("")
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

    @Post("sign")
    async createSign(@Req() req: Request, @Res() res: Response) { }

    @Post("verify")
    async VerifySign(@Req() req: Request, @Res() res: Response) { }

}
