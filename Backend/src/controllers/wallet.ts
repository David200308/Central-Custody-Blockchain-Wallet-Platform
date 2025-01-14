import { Body, Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { WalletServices } from '../services/wallet';
import { Response, Request } from 'express';

@Controller("wallet")
export class WalletController {
    constructor(private readonly walletService: WalletServices) { }

    @Post("create")
    async createWallet(@Req() req: Request, @Res() res: Response) {}

    @Post("sign")
    async createSign(@Req() req: Request, @Res() res: Response) {}

    @Post("verify")
    async VerifySign(@Req() req: Request, @Res() res: Response) {}

}
