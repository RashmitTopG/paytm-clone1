"use server"

import { getServerSession } from "next-auth"
import { AuthOptions } from "next-auth"
import prisma from "@repo/db/client"
import { authOptions } from "../auth"
import { timeStamp } from "console"

export async function p2pTransfer(to : string , amount :number){

    const session = await getServerSession(authOptions);
    const from = session?.user?.id;
    if (!from) {
        return {
            message : "Error while Sending"
        }
    }
    
    const toUser = await prisma.user.findFirst({
        where : {
            number : to
        }
    });

    if (!toUser) {
        return {
            message : "User Not Found"
        }
    }

    await prisma.$transaction(async (tx)=>{

        await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userid" = ${Number(from)} FOR UPDATE`;
        const fromBalance = await tx.balance.findUnique({
            where : {
                userId : Number(from)
            }
        })
        if (!fromBalance || fromBalance.amount < amount) {
            throw new Error("Insufficient Funds")
        }

        await tx.balance.update({
            where : {userId : Number(from)},
            data : {amount : {
                decrement : amount
            }}
        })

        await tx.balance.update({
            where:{
                userId : toUser.id
            },
            data:{
                amount : {
                    increment : amount
                }
            }
        })
        
        await tx.p2pTransfer.create({
            data:{
                fromUserId : Number(from),
                toUserId : toUser.id,
                amount,
                timestamp : new Date()
            }
        })
    })


}